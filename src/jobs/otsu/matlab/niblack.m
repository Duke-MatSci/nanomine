  
%NIBLACK local thresholding.
%   BW = NIBLACK(IMAGE) performs local thresholding of a two-dimensional
%   array IMAGE with Niblack method. 
%      
%   BW = NIBLACK(IMAGE, [M N], K, OFFSET, PADDING) performs local
%   thresholding with M-by-N neighbourhood (default is 3-by-3). The default
%   value for K is -0.2. The default value of OFFSET is 0, which 
%   coresponds to the original Niblack implementation. To deal with border 
%   pixels the image is padded with one of PADARRAY options (default is 
%   'replicate').
%       
%   Example
%   -------
%       imshow(niblack(imread('eight.tif'), [25 25], -0.2, 10));
%
%   See also PADARRAY, RGB2GRAY.

%   Contributed by Jan Motl (jan@motl.us)
%   $Revision: 1.0 $  $Date: 2013/03/09 16:58:01 $



function niblack(userId, jobId, jobType, jobSrcDir, jobDir, webBaseUri,input_type,file_name,window, k, offset)

    k = str2num(k)
    offset = str2num(offset)
    padding = 'replicate';
    window = [str2num(window) str2num(window)]

    rc=0;
    try
        path_to_read = [jobSrcDir,'/'];
        path_to_write = [jobSrcDir,'/output'];
        mkdir(path_to_write);
        writeError([path_to_write, '/errors.txt'], ''); % ensure that errors.txt exists

        try
            switch str2num(input_type)
                case 1
                    img = imread([path_to_read,file_name]);
                    if size(img) > 1
                        imwrite(img(:,:,1),[path_to_write,'/','Input1.jpg'])
                    end
                case 2
                    rc = 91
                    exit(rc)
                case 3
                    path=[path_to_read,file_name];
                    k=load(path);
                    [no_need,f_name,ext]=fileparts(file_name);
                    img = getfield(k,f_name);
                    imwrite(img,[path_to_write,'/','Input1.jpg']);
            end
        catch ex
            rc = 98;
            msg = getReport(ex);
            writeError([path_to_write, '/errors.txt'], msg);
            writeError([path_to_write, '/errors.txt'], sprintf('\n'));
            exit(rc);
        end

        % Convert to double
        image = double(img)

        % Mean value
        mean = averagefilter(image, window, padding);

        % Standard deviation
        meanSquare = averagefilter(image.^2, window, padding);
        deviation = ((meanSquare - mean.^2)).^0.5;

        % Initialize the output
        output = zeros(size(image));

        % Niblack
        output(image > mean + k * deviation - offset) = 1;

        % write output image
        imwrite(output,[path_to_write,'/','Binarized_Input1.jpg']);

    catch
        rc = 99;
        exit(rc);
    end
        function writeError(file, msg)
        f = fopen(file,'a+');
        fprintf(f, '%s\n', msg);
        fclose(f);
        end
    end

    function writeError(file, msg)
        f = fopen(file,'a+');
        fprintf(f, '%s\n', msg);
        fclose(f);
    end