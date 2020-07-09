function IntelligentCharacterize(userID, jobID, jobType, jobSrcDir, jobDir, webBaseUri, input_type, file_name)

%%% Input Types %%
% 1: Single JPEG Image
% 2: ZIP file containing JPEG images
% 3: Image in .mat file

rc = 0;
try

    path_to_read = [jobSrcDir, '/'];
    path_to_write = [jobSrcDir, '/output'];
    mkdir(path_to_write);
    writeError([path_to_write, '/errors.txt'], '');
    %% Specify import function according to input option
    try
        switch str2num(input_type)
            case 1
                img = imread([path_to_read, file_name]);
            case 2
                img = unzip([path_to_read, file_name], [path_to_write, '/', 'input']);
            case 3
                path=[path_to_read,file_name];
                k=load(path);
                [~,f_name,ext]=fileparts(file_name);
                try
                    img = getfield(k,f_name);
                catch ex
                    rc = 98;
                    msg = getReport(ex);
                    writeError([path_to_write, '/errors.txt'], ...
                        'The variable name inside the material file shold be the same as the name of the file. Technical details below:');
                    writeError([path_to_write, '/errors.txt'], msg);
                    writeError([path_to_write, '/errors.txt'], newline);
                    exit(rc);
                end
        end
    catch ex
        rc = 97;
        msg = getReport(ex);
        writeError([path_to_write, '/errors.txt'], 'Error reading the image. Technical details are below:');
        writeError([path_to_write, '/errors.txt'], msg);
        writeError([path_to_write, '/errors.txt'], newline);
        exit(rc);
    end
    % Otsu binarize

    try
        if str2num(input_type) ~= 2
            if length(size(img)) > 2
                img = img(:,:,1);
            end
            if max(img(:))>1
                Target = double(img);
                Target = Target/256; %
                level = graythresh(Target);
                img = imbinarize(Target,level);
            end
            imwrite(256*img, [path_to_write, '/', 'Input1.jpg']);
        end

        % Deal with odd shaped images
        md = min(size(img));
        img = img(1:md,1:md);
    catch ex
        rc = 96;
        msg = getReport(ex);
        writeError([path_to_write, '/errors.txt'], 'Error preprocessing the image. Technical details are below:');
        writeError([path_to_write, '/errors.txt'], msg);
        writeError([path_to_write, '/errors.txt'], newline);
        exit(rc);
    end


    %% Image read done, now work on output
    try
        SDFsize = 200;

        vol_frac = mean(img(:));  % Volume fraction
        perim = bwperim(img);
        intf_area = sum(perim(:));  % Interfacial area


        [connectivity, concavity] = check_shape(img);
        sdf2d = fftshift(abs(fft2(img-vol_frac)).^2);
        [isotropy, ~] = check_isotropy(sdf2d);

        csvtarget = [path_to_write, '/output.csv'];
        fid = fopen(csvtarget,'w');
        fprintf(fid, '%s%s%s\n', 'Sample name', ',', file_name);
        fprintf(fid, '%s%s%s%s%s%s%s\n', 'Universal descriptors', ',', 'Void fraction', ',',...
            'Interfacial area', ',', 'Isotropy');
        fprintf(fid, '%s%s%f%s%f%s%f\n', ' ', ',', vol_frac, ',', intf_area, ',', isotropy);
    catch ex
        rc = 89;
        msg = getReport(ex);
        writeError([path_to_write, '/errors.txt'], 'Error calculating universal descriptors. Technical details are below:');
        writeError([path_to_write, '/errors.txt'], msg);
        writeError([path_to_write, '/errors.txt'], newline);
        exit(rc);
    end
    if all(connectivity == [1, 0]) || all(connectivity == [0, 1]) && (concavity < 1.2)
        try
            % Use descriptors
            charac='Descriptors'
            fprintf(fid, '%s%s%s\n', 'Characterization method selected', ',', 'Speroidal descriptors');
            fprintf(fid, '\n');
            fprintf(fid, '%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s%s\n', 'Spheroidal descriptors', ',', ...
                'Mean neighbor distance', ',', 'Cluster number', ',', 'Compactness', ',', 'Cluster area', ...
                ',', 'Cluster radius', ',', 'Elongation ratio', ',', 'Orientation angle', ',', 'Rectangularity');
            cimg = bwlabel(img);
            [mean_neighbor_distance, ~, ~] = nearest_center_distance(cimg);
            [cluster_number, compactness, c_area, c_radius] = faster_nh_ch(cimg);
            [elong_ratio, ~, orien_angle, rectangularity] = faster_elongation_II(cimg);
            fprintf(fid, '%s%s%f%s%f%s%f%s%f%s%f%s%f%s%f%s%f\n', 'Mean value', ',', mean_neighbor_distance, ',',...
                cluster_number, ',', mean(compactness), ',', mean(c_area), ',', mean(c_radius), ',', mean(elong_ratio),...
                ',', mean(orien_angle), ',', mean(rectangularity));
            fprintf(fid, '%s%s%s%s%s%s%f%s%f%s%f%s%f%s%f%s%f\n', 'Variance', ',', ' ', ',', ' ', ...
                ',', var(compactness), ',', var(c_area), ',', var(c_radius), ',', var(elong_ratio), ...
                ',', var(orien_angle), ',', var(rectangularity));
        catch ex
            rc = 88;
            msg = getReport(ex);
            writeError([path_to_write, '/errors.txt'], 'Error calculating Spheroidal descriptors. Technical details are below:');
            writeError([path_to_write, '/errors.txt'], msg);
            writeError([path_to_write, '/errors.txt'], newline);
            exit(rc);
        end

    else  % Isotropy check is not included yet
        % Use SDF
        try
        charac='SDF'
            fprintf(fid, '%s%s%s\n', 'Characterization method selected', ',', 'SDF');
            fprintf(fid, '\n');
            fprintf(fid, '%s\n', 'SDF');

            sdf1d = FFT2oneD(sdf2d);
            fit_result = SDFFit(sdf1d, SDFsize, true, path_to_write);  % true - show fitting image
            fprintf(fid, '%s%s%s\n', 'Fitting function', ',', fit_result('func_type'));
            fprintf(fid, '%s', 'PARAM (i)');
            fprintf(fid, ', %f', fit_result('parameters'));
            fprintf(fid, '\n');
            fprintf(fid, '%s%s%s%s%s\n', 'Fitting goodness', ',', 'R^2', ',', 'rmse');
            gof = fit_result('goodness');
            fprintf(fid, '%s%s%f%s%f\n', ' ', ',', gof(1), ',', gof(2));
            fprintf(fid, '%s%s%s\n', 'Function definition', ',', fit_result('func_def'));
            fprintf(fid, '%s%s%s\n', 'Remarks', ',', fit_result('remarks'));
            % Save 2D SDF image
            figure('color',[1,1,1])
            hold on;
            clims = [1e4 7e5];
            map = [0.0, 0, 0
                1.0, 0.5, 0
                1.0, 1.0, 0
                1.0, 0, 0];
            imagesc(sdf2d,clims); colormap(map);
            xlim([0 size(img,1)]); ylim([0 size(img,2)]);
            set(gca,'xtick',[]); set(gca,'ytick',[]);
            saveas(gcf,[path_to_write,'/SDF_2D.jpg']);
            hold off
        catch ex
            rc = 87;
            msg = getReport(ex);
            writeError([path_to_write, '/errors.txt'], 'Error calculating SDF. Technical details are below:');
            writeError([path_to_write, '/errors.txt'], msg);
            writeError([path_to_write, '/errors.txt'], newline);
            exit(rc);
        end
    end

    % Zip files
    fclose(fid);
    zip([path_to_write, '/Results.zip'], {'*'}, [path_to_write, '/']);
    %% universal.vf=vol_frac;
    %% universal.intf_area=intf_area;
    %% universal.isotropy=isotropy;
    %% root.universal=universal;
    %% root.charac=charac;
    %% rez = jsonencode(root);
    rez = ['{"universal":{"vf":',num2str(vol_frac),',"intf_area":',num2str(intf_area),',"isotropy":',num2str(isotropy),'},"charac":"',charac,'"}']
    fi=fopen([path_to_write,'/result_json.json'],'w');
    fprintf(fi,'%s',rez);
    fclose(fi);
catch ex
    msg = getReport(ex)
    writeError([path_to_write, '/errors.txt'], 'Unexpected general error. Technical details are below:');
    writeError([path_to_write, '/errors.txt'], msg);
    rc = 99;
    exit(rc);
end

    function writeError(file, msg)
        f = fopen(file, 'a+');
        fprintf(f, '%s\n', msg);
        fclose(f);
    end

end
