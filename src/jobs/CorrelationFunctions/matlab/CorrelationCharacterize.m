function CorrelationCharacterize(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri,input_type,correlation_type,file_name)

%%% Input Types %%
% 1 : Single JPEG Image
% 2 : ZIP file containing JPEG images
% 3 : Image in .mat file
%%
%%% types of correlation function available %%
% 1 : Two Point Autocorrelation
% 2 : Two point Lineal Path Correlation
% 3 : Two point Cluster Correlation
% 4 : Two point Surface-Surface Correlation
%%%

%%% umar edits
% Odd images accepted
% Binarize

rc=0;
try
    path_to_read = [jobSrcDir,'/'];
    path_to_write = [jobSrcDir,'/output'];
    mkdir(path_to_write);
    writeError([path_to_write, '/errors.txt'], ''); % ensure that errors.txt exists
    %% Specify import function according to input option
    switch str2num(input_type)
        case 1
            img = imread([path_to_read,file_name]); % read the incming target and store pixel values
        if max(img(:))>1
            Target = double(img);
            Target = Target/256; %
            level = graythresh(Target);
            img = im2bw(Target,level);
        end
            imwrite(256*img,[path_to_write,'/','Input1.jpg']);
        case 2
            img = unzip([path_to_read,file_name],[path_to_write,'/input']);
        case 3
            path=[path_to_read,file_name];
            k=load(path);
            [no_need,f_name,ext]=fileparts(file_name);
            try
                img = getfield(k,f_name);
            catch ex
                rc = 98;
                msg = getReport(ex);
                writeError([path_to_write, '/errors.txt'], 'The variable name inside the material file shold be the same as the name of the file. Technical details below:');
                writeError([path_to_write, '/errors.txt'], msg);
                writeError([path_to_write, '/errors.txt'], sprintf('\n'));
                exit(rc);
            end
            img_viewable = 256 * img;
            imwrite(img_viewable,[path_to_write,'/','Input1.jpg']);
    end

    if str2num(input_type) ~= 2
        if length(size(img)) > 2
            img = img(:,:,1);
        end
        %%Umar added to deal with odd shaped images

        md=min(size(img));
        img=img(1:md,1:md);

        %% Umar added to check and binarize the image using Otsu
        if max(img(:))>1
            Target = double(img);
            Target = Target/256; %
            level = graythresh(Target);
            Target_img = im2bw(Target,level);
        else
            Target_img=img;
        end

        plot_correlation(Target_img,str2num(correlation_type),path_to_write);

    else
        zip_file_processing(path_to_write,str2num(correlation_type));
    end

    %% ZIP files %%
    zip([path_to_write,'/Results.zip'],{'*'},path_to_write);

catch ex
    rc = 99;
    exit(rc);
end
    function writeError(file, msg)
        f = fopen(file,'a+');
        fprintf(f, '%s\n', msg);
        fclose(f);
    end
end
